import type { Elev } from "../student";
import type { EntraUser } from "../user";

export interface IFintClient {
  /** Henter alle elever fra FINT APIet */
  getStudents: () => Promise<Elev[]>;
  /** Henter ENTRA-brukere som har tilgang via enterprise-appen  */
  getUsers: () => Promise<EntraUser[]>;
}