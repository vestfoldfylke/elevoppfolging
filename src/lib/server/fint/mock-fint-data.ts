import type { FintElev, FintElevforhold, FintGyldighetsPeriode, FintKlasse, FintKontaktlarergruppe, FintSchoolWithStudents, FintUndervisningsforhold, FintUndervisningsgruppe } from "$lib/types/fint/fint-school-with-students"
import { Faker, nb_NO, en } from '@faker-js/faker';

export const norwegianFaker = new Faker({
  locale: [nb_NO, en]
});

const validPeriod: FintGyldighetsPeriode = {
  start: "2022-08-15T00:00:00Z",
  slutt: null
}

const expiredPeriod: FintGyldighetsPeriode = {
  start: "2020-08-15T00:00:00Z",
  slutt: "2022-08-15T00:00:00Z"
}

const futurePeriod: FintGyldighetsPeriode = {
  start: "2123-08-15T00:00:00Z",
  slutt: null
}

const generatedNames: Record<string, boolean> = {}

type UniqueName = {
  firstName: string,
  lastName: string,
  feidePrefix: string
}

const generateUniqueName = (): UniqueName => {
  let randomName = norwegianFaker.person.fullName()
  while(randomName in generatedNames || randomName.split(" ").length < 2) {
    randomName = norwegianFaker.person.fullName()
  }
  const firstName = randomName.substring(0, randomName.lastIndexOf(" "))
  const lastName = randomName.substring(randomName.lastIndexOf(" ") + 1)
  const feidePrefix = randomName.toLowerCase().replaceAll(" ", ".")
  generatedNames[randomName] = true

  return { firstName, lastName, feidePrefix }
}


/* 
skole
  elevforhold
    elev
    programomrademedlemskap
      programomrade
        utdanningsprogram
    klassemedlemskap
      klasse
        trinn
        undervisningsforhold
    undervisningsgruppemedlemskap
      undervisningsgruppe
        undervisningsforhold
    kontaktlarergruppemedlemskap
      kontaktlarergruppe
        undervisningsforhold




*/



const generateUndervisningsforhold = (): FintUndervisningsforhold => {
  const uniqueName: UniqueName = generateUniqueName()
  return {
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    skoleressurs: {
      systemId: {
        identifikatorverdi: norwegianFaker.string.uuid(),
      },
      feidenavn: {
        identifikatorverdi: `${uniqueName.feidePrefix}@fylke.no`
      },
      person: {
        navn: {
          fornavn: uniqueName.firstName,
          etternavn: uniqueName.lastName
        }
      }
    }
  }
}

const generateKlasse = (undervisningsforhold: FintUndervisningsforhold[]): FintKlasse => {
  const trinn: number = norwegianFaker.number.int({ min: 1, max: 2000 })
  return {
    navn: `${trinn}${norwegianFaker.helpers.arrayElement(["BAB", "STB", "TUT", "HAH", "JAU", "SUP"])}`,
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    trinn: {
      navn: `VG${trinn}`,
      grepreferanse: ["VGS"]
    },
    undervisningsforhold: undervisningsforhold
  }
}

const generateUndervisningsgruppe = (undervisningsforhold: FintUndervisningsforhold[]): FintUndervisningsgruppe => {
  const trinn: number = norwegianFaker.number.int({ min: 1, max: 2000 })
  return {
    navn: `${norwegianFaker.helpers.arrayElement(["MATTE", "NORSK", "TUT", "HAH", "JAU", "SUP"])}${trinn}`,
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    undervisningsforhold: undervisningsforhold,
  }
}

const generateKontaktlarergruppe = (undervisningsforhold: FintUndervisningsforhold[]): FintKontaktlarergruppe => {
  const trinn: number = norwegianFaker.number.int({ min: 1, max: 2000 })
  return {
    navn: `${trinn}${norwegianFaker.helpers.arrayElement(["BAB", "STB", "TUT", "HAH", "JAU", "SUP"])}`,
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    undervisningsforhold: undervisningsforhold
  }
}

const generateElev = (): FintElev => {
  const uniqueName: UniqueName = generateUniqueName()
  return {
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    elevnummer: {
      identifikatorverdi: norwegianFaker.string.numeric(5)
    },
    feidenavn: {
      identifikatorverdi: `${uniqueName.feidePrefix}@fylke.no`
    },
    person: {
      navn: {
        fornavn: uniqueName.firstName,
        etternavn: uniqueName.lastName
      },
      fodselsnummer: {
        identifikatorverdi: uniqueName.feidePrefix
      }
    }
  }
}

const lottoPeriods = [validPeriod, validPeriod, validPeriod, validPeriod, validPeriod, validPeriod, expiredPeriod, futurePeriod]

const generateElevforhold = (elev: FintElev, klasse: FintKlasse[], undervisningsgrupper: FintUndervisningsgruppe[], kontaktlarergrupper: FintKontaktlarergruppe[]): FintElevforhold => {
  return {
    elev: elev,
    hovedskole: norwegianFaker.datatype.boolean(),
    systemId: {
      identifikatorverdi: norwegianFaker.string.uuid(),
    },
    gyldighetsperiode: norwegianFaker.helpers.arrayElement(lottoPeriods),
    klassemedlemskap: klasse.map(k => ({
      systemId: {
        identifikatorverdi: norwegianFaker.string.uuid(),
      },
      gyldighetsperiode: norwegianFaker.helpers.arrayElement(lottoPeriods),
      klasse: k
    })),
    undervisningsgruppemedlemskap: undervisningsgrupper.map(ug => ({
      systemId: {
        identifikatorverdi: norwegianFaker.string.uuid(),
      },
      gyldighetsperiode: norwegianFaker.helpers.arrayElement(lottoPeriods),
      undervisningsgruppe: ug
    })),
    kontaktlarergruppemedlemskap: kontaktlarergrupper.map(kg => ({
      systemId: {
        identifikatorverdi: norwegianFaker.string.uuid(),
      },
      gyldighetsperiode: norwegianFaker.helpers.arrayElement(lottoPeriods),
      kontaktlarergruppe: kg
    }))
  }
}

const generateSchool = (name: string, elevforhold: FintElevforhold[]): FintSchoolWithStudents => {
  return {
    skole: {
      skolenummer: {
        identifikatorverdi: norwegianFaker.string.numeric(8)
      },
      navn: name,
      elevforhold: elevforhold
    }
  }
}

type GenerateMockFintSchoolsWithStudentsOptions = {
  schoolNames: string[],
  numberOfStudents: number
  numberOfKlasser: number
  numberOfUndervisningsgrupper: number
  numberOfKontaktlarergrupper: number
  numberOfUndervisningsforhold: number
}

export const generateMockFintSchoolsWithStudents = (config: GenerateMockFintSchoolsWithStudentsOptions): FintSchoolWithStudents[] => {
  
  /*
  Så hvis vi først lager en haug med undervisningsforhold (lærere)
  Deretter kan vi lage en haug med klasser, kontaktlærergrupper og undervisningsgrupper som bruker disse lærerne
  Så kan vi lage en haug med elever
    Så kan vi lage en haug med elevforhold som binder sammen elever, klasser, undervisningsgrupper, kontaktlærergrupper og programområder, litt random. Noen har gyldige perioder, noen har utgåtte, noen har fremtidige
      Pass på at noen elever har flere elevforhold til flere skoler (hovedskole og ikke-hovedskole)
      Så kan vi lage noen skoler, og putte elevforholdene litt random inn i disse skolene
  */
  const undervisningsforholdPool: FintUndervisningsforhold[] = []
  for(let i = 0; i < config.numberOfUndervisningsforhold; i++) {
    undervisningsforholdPool.push(generateUndervisningsforhold())
  }
  
  const klasserPool: FintKlasse[] = []
  for(let i = 0; i < config.numberOfKlasser; i++) {
    const undervisningsforhold = norwegianFaker.helpers.arrayElements(undervisningsforholdPool)
    klasserPool.push( generateKlasse(undervisningsforhold) )
  }

  const undervisningsgrupperPool: FintUndervisningsgruppe[] = []
  for(let i = 0; i < config.numberOfUndervisningsgrupper; i++) {
    const undervisningsforhold = norwegianFaker.helpers.arrayElements(undervisningsforholdPool)
    undervisningsgrupperPool.push( generateUndervisningsgruppe(undervisningsforhold) )
  }

  const kontaktlarergrupperPool: FintKontaktlarergruppe[] = []
  for(let i = 0; i < config.numberOfKontaktlarergrupper; i++) {
    const undervisningsforhold = norwegianFaker.helpers.arrayElements(undervisningsforholdPool)
    kontaktlarergrupperPool.push( generateKontaktlarergruppe(undervisningsforhold) )
  }

  const elevPool: FintElev[] = []
  for(let i = 0; i < config.numberOfStudents; i++) {
    elevPool.push( generateElev() )
  }

  const elevforholdPool: FintElevforhold[] = []
  elevPool.forEach(elev => {
    const klasse = norwegianFaker.helpers.arrayElements(klasserPool, { min: 1, max: 3 })
    const undervisningsgrupper = norwegianFaker.helpers.arrayElements(undervisningsgrupperPool, { min: 1, max: 5 })
    const kontaktlarergrupper = norwegianFaker.helpers.arrayElements(kontaktlarergrupperPool, { min: 1, max: 2 })
    elevforholdPool.push( generateElevforhold(elev, klasse, undervisningsgrupper, kontaktlarergrupper) )
  })

  const schools: FintSchoolWithStudents[] = []
  config.schoolNames.forEach(schoolName => {
    const elevforhold = norwegianFaker.helpers.arrayElements(elevforholdPool, { min: Math.floor(config.numberOfStudents / config.schoolNames.length / 2), max: Math.floor(config.numberOfStudents / config.schoolNames.length) })
    schools.push( generateSchool(schoolName, elevforhold) )
  })
  return schools
}
