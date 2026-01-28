import type { FintSkole } from "./fint-school-with-students";

export type FintSchool = Omit<FintSkole, 'elevforhold'>;