import { register } from "@vestfoldfylke/vestfold-metrics"

// TODO: add check that visitor have Metrics role
export const GET = async () => {
  return new Response(await register.metrics(), {
    headers: { "Content-Type": "text/plain" }
  })
}
