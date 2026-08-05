import axios from "axios";

/**
 * Instância única do Axios usada por toda a aplicação.
 *
 * A URL base aponta para o backend local por padrão, de modo que o projeto rode
 * sem nenhum arquivo de ambiente. Em outros ambientes, basta definir
 * NEXT_PUBLIC_API_URL.
 */
const DEFAULT_API_URL = "http://localhost:8000/api/v1";

export const httpClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL,
  timeout: 10_000,
});
