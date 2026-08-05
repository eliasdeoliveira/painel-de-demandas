"""Testes dos endpoints de demandas."""

from fastapi.testclient import TestClient

from app.modules.demands.tests.factories import demand_payload

DEMANDS_URL = "/api/v1/demands"


def create_demand(client: TestClient, **overrides) -> dict:
    response = client.post(DEMANDS_URL, json=demand_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def test_create_returns_201_with_the_calculated_priority(client: TestClient):
    response = client.post(DEMANDS_URL, json=demand_payload(impact=5, urgency=3))

    assert response.status_code == 201
    body = response.json()
    assert body["priorityScore"] == 13
    assert body["status"] == "pending"
    assert body["id"] > 0


def test_create_ignores_a_priority_sent_by_the_client(client: TestClient):
    """A pontuação é calculada no servidor: o cliente não pode forjá-la."""
    response = client.post(DEMANDS_URL, json={**demand_payload(impact=1, urgency=1), "priorityScore": 99})

    assert response.json()["priorityScore"] == 3


def test_create_rejects_an_invalid_payload_with_field_details(client: TestClient):
    response = client.post(
        DEMANDS_URL, json=demand_payload(title="ab", impact=9, urgency=0, requester="")
    )

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert {detail["field"] for detail in error["details"]} == {
        "title",
        "impact",
        "urgency",
        "requester",
    }


def test_create_rejects_a_title_made_only_of_spaces(client: TestClient):
    response = client.post(DEMANDS_URL, json=demand_payload(title="     "))

    assert response.status_code == 422


def test_list_returns_demands_ordered_by_priority(client: TestClient):
    create_demand(client, title="Baixa", impact=1, urgency=1)
    create_demand(client, title="Alta", impact=5, urgency=5)

    response = client.get(DEMANDS_URL)

    assert response.status_code == 200
    assert [item["title"] for item in response.json()["items"]] == ["Alta", "Baixa"]


def test_list_returns_the_pagination_envelope(client: TestClient):
    for index in range(3):
        create_demand(client, title=f"Demanda {index}")

    body = client.get(DEMANDS_URL, params={"page": 1, "limit": 2}).json()

    assert body["page"] == 1
    assert body["limit"] == 2
    assert body["total"] == 3
    assert body["totalPages"] == 2
    assert len(body["items"]) == 2


def test_list_returns_an_empty_page_when_nothing_matches(client: TestClient):
    create_demand(client, title="Exportar relatório")

    body = client.get(DEMANDS_URL, params={"search": "inexistente"}).json()

    assert body["items"] == []
    assert body["total"] == 0
    assert body["totalPages"] == 0


def test_list_rejects_an_unknown_sort_field(client: TestClient):
    response = client.get(DEMANDS_URL, params={"sort": "qualquerCoisa"})

    assert response.status_code == 422


def test_list_rejects_a_page_below_one(client: TestClient):
    response = client.get(DEMANDS_URL, params={"page": 0})

    assert response.status_code == 422


def test_get_returns_the_requested_demand(client: TestClient):
    created = create_demand(client)

    response = client.get(f"{DEMANDS_URL}/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_returns_404_for_an_unknown_demand(client: TestClient):
    response = client.get(f"{DEMANDS_URL}/9999")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "resource_not_found"


def test_update_changes_the_fields_and_the_priority(client: TestClient):
    created = create_demand(client, impact=1, urgency=1)

    response = client.patch(f"{DEMANDS_URL}/{created['id']}", json={"impact": 5})

    assert response.status_code == 200
    assert response.json()["priorityScore"] == 11


def test_update_returns_404_for_an_unknown_demand(client: TestClient):
    response = client.patch(f"{DEMANDS_URL}/9999", json={"title": "Novo título"})

    assert response.status_code == 404


def test_change_status_updates_the_demand(client: TestClient):
    created = create_demand(client)

    response = client.patch(f"{DEMANDS_URL}/{created['id']}/status", json={"status": "in_progress"})

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_change_status_rejects_an_unknown_status(client: TestClient):
    created = create_demand(client)

    response = client.patch(f"{DEMANDS_URL}/{created['id']}/status", json={"status": "arquivada"})

    assert response.status_code == 422


def test_delete_removes_the_demand(client: TestClient):
    created = create_demand(client)

    assert client.delete(f"{DEMANDS_URL}/{created['id']}").status_code == 204
    assert client.get(f"{DEMANDS_URL}/{created['id']}").status_code == 404


def test_delete_returns_404_for_an_unknown_demand(client: TestClient):
    assert client.delete(f"{DEMANDS_URL}/9999").status_code == 404


def test_summary_counts_demands_by_status(client: TestClient):
    first = create_demand(client)
    create_demand(client)
    client.patch(f"{DEMANDS_URL}/{first['id']}/status", json={"status": "completed"})

    body = client.get(f"{DEMANDS_URL}/summary").json()

    assert body == {"total": 2, "pending": 1, "inProgress": 0, "completed": 1, "cancelled": 0}


def test_status_history_starts_with_the_creation_event(client: TestClient):
    created = create_demand(client)

    response = client.get(f"{DEMANDS_URL}/{created['id']}/status-history")

    assert response.status_code == 200
    history = response.json()
    assert len(history) == 1
    assert history[0]["fromStatus"] is None
    assert history[0]["toStatus"] == "pending"
    assert history[0]["changedAt"].endswith("Z")


def test_status_history_records_each_change(client: TestClient):
    created = create_demand(client)
    client.patch(f"{DEMANDS_URL}/{created['id']}/status", json={"status": "in_progress"})
    client.patch(f"{DEMANDS_URL}/{created['id']}/status", json={"status": "completed"})

    history = client.get(f"{DEMANDS_URL}/{created['id']}/status-history").json()

    assert [(event["fromStatus"], event["toStatus"]) for event in history] == [
        (None, "pending"),
        ("pending", "in_progress"),
        ("in_progress", "completed"),
    ]


def test_status_history_returns_404_for_an_unknown_demand(client: TestClient):
    response = client.get(f"{DEMANDS_URL}/9999/status-history")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "resource_not_found"


def test_created_at_is_returned_in_utc(client: TestClient):
    """O frontend precisa do fuso explícito para exibir a data corretamente."""
    created = create_demand(client)

    assert created["createdAt"].endswith("Z")
