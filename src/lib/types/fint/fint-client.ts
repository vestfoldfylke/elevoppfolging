import type {Elev} from "$lib/types/fint-types";

export interface IFintClient {
  /** Henter alle elever fra FINT APIet */
  getStudents: () => Promise<Elev[]>;
}
