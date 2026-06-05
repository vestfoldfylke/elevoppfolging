import { flushSync } from "svelte"
import { describe, expect, test } from "vitest"
import { createEditableDraft } from "$lib/runes/create-editable-draft.svelte"

const sourceStateData = {
  name: "Alice",
  age: 30,
  address: {
    city: "Oslo",
    country: "Norway"
  },
  hobbies: [
    {
      name: "Reading",
      books: [
        { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
        { title: "To Kill a Mockingbird", author: "Harper Lee" }
      ]
    }
  ]
}

type SourceStateData = typeof sourceStateData

const getSourceDataFromState = (stateData: SourceStateData) => {
  return {
    name: stateData.name,
    city: stateData.address.city,
    hobbies: stateData.hobbies,
    firstBookTitle: stateData.hobbies[0].books[0].title
  }
}

describe("createEditable", () => {
  test("should initialize with specific propeties from source value of deep nested object state", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      // Use flushSync to execute all pending effects synchronously
      flushSync()

      expect(editableState.draft).toEqual({
        name: "Alice",
        city: "Oslo",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })

      expect(editableState.isDirty).toBe(false)
    })

    withEffect()
  })

  test("should only update draft editing draft, source should remain unchanged", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      // Use flushSync to execute all pending effects synchronously
      flushSync()

      editableState.draft.name = "Bob"
      editableState.draft.city = "Bergen"
      editableState.draft.hobbies[0].name = "Cooking"
      editableState.draft.firstBookTitle = "1984"

      // Also remove the first book from the hobbies to test that we are not mutating the original source when we edit the draft
      editableState.draft.hobbies[0].books.shift()

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Bob",
        city: "Bergen",
        hobbies: [
          {
            name: "Cooking",
            books: [{ title: "To Kill a Mockingbird", author: "Harper Lee" }]
          }
        ],
        firstBookTitle: "1984"
      })

      expect(editableState.isDirty).toBe(true)
      expect(sourceState.name).toBe("Alice")
      expect(sourceState.address.city).toBe("Oslo")
      expect(sourceState.hobbies[0].name).toBe("Reading")
      expect(sourceState.hobbies[0].books[0].title).toBe("The Great Gatsby")
    })

    withEffect()
  })

  test("should set isDirty to true when draft is edited and back to false and source data when cancelled", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      // Use flushSync to execute all pending effects synchronously
      flushSync()

      editableState.draft.name = "Bob"
      editableState.draft.city = "Bergen"
      editableState.draft.hobbies[0].name = "Cooking"
      editableState.draft.firstBookTitle = "1984"

      // Also remove the first book from the hobbies to test that we are not mutating the original source when we edit the draft
      editableState.draft.hobbies[0].books.shift()

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Bob",
        city: "Bergen",
        hobbies: [
          {
            name: "Cooking",
            books: [{ title: "To Kill a Mockingbird", author: "Harper Lee" }]
          }
        ],
        firstBookTitle: "1984"
      })

      expect(editableState.isDirty).toBe(true)

      expect(sourceState.name).toBe("Alice")
      expect(sourceState.address.city).toBe("Oslo")
      expect(sourceState.hobbies[0].name).toBe("Reading")
      expect(sourceState.hobbies[0].books[0].title).toBe("The Great Gatsby")

      editableState.cancel()

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Alice",
        city: "Oslo",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })

      expect(sourceState.name).toBe("Alice")
      expect(sourceState.address.city).toBe("Oslo")
      expect(sourceState.hobbies[0].name).toBe("Reading")
      expect(sourceState.hobbies[0].books[0].title).toBe("The Great Gatsby")

      expect(editableState.isDirty).toBe(false)

      // Verify draft is still a deep clone after cancel — mutating it must not affect source
      editableState.draft.hobbies[0].books.shift()

      flushSync()

      expect(sourceState.hobbies[0].books.length).toBe(2)
    })

    withEffect()
  })

  test("should update draft to match source value when anything in source value changes", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      // Use flushSync to execute all pending effects synchronously
      flushSync()

      expect(editableState.draft).toEqual({
        name: "Alice",
        city: "Oslo",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })

      // Now update the source state directly and test that the draft is updated to match the source value
      sourceState.name = "Gunnar"

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Gunnar",
        city: "Oslo",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })

      // Make some edits to draft
      editableState.draft.name = "Bob"
      editableState.draft.city = "Bergen"
      editableState.draft.hobbies[0].name = "Cooking"
      editableState.draft.firstBookTitle = "1984"
      // Also remove the first book from the hobbies to test that we are not mutating the original source when we edit the draft
      editableState.draft.hobbies[0].books.shift()

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Bob",
        city: "Bergen",
        hobbies: [
          {
            name: "Cooking",
            books: [{ title: "To Kill a Mockingbird", author: "Harper Lee" }]
          }
        ],
        firstBookTitle: "1984"
      })

      expect(editableState.isDirty).toBe(true)

      // Check that we still have 2 books in source state
      expect(sourceState.hobbies[0].books.length).toBe(2)

      // Now update the source state directly again and test that the draft is updated to match the source value and that we have 2 books in the draft again
      sourceState.address.city = "Bergen"

      flushSync()

      expect(editableState.draft).toEqual({
        name: "Gunnar",
        city: "Bergen",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })

      expect(editableState.isDirty).toBe(false)

      expect(sourceState.name).toBe("Gunnar")
      expect(sourceState.address.city).toBe("Bergen")
      expect(sourceState.hobbies[0].name).toBe("Reading")
      expect(sourceState.hobbies[0].books[0].title).toBe("The Great Gatsby")
      expect(sourceState.hobbies[0].books.length).toBe(2)
    })

    withEffect()
  })

  test("should leave draft unchanged and isDirty false when cancel is called while not dirty", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      flushSync()

      expect(editableState.isDirty).toBe(false)

      editableState.cancel()

      flushSync()

      expect(editableState.isDirty).toBe(false)
      expect(editableState.draft).toEqual({
        name: "Alice",
        city: "Oslo",
        hobbies: [
          {
            name: "Reading",
            books: [
              { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
              { title: "To Kill a Mockingbird", author: "Harper Lee" }
            ]
          }
        ],
        firstBookTitle: "The Great Gatsby"
      })
    })

    withEffect()
  })

  test("should cancel to current source value, not original, when source has changed since initialization", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      flushSync()

      sourceState.name = "Gunnar"
      sourceState.address.city = "Bergen"

      flushSync()

      expect(editableState.draft.name).toBe("Gunnar")
      expect(editableState.draft.city).toBe("Bergen")

      editableState.draft.name = "Bob"
      editableState.draft.city = "Stavanger"

      flushSync()

      expect(editableState.isDirty).toBe(true)

      editableState.cancel()

      flushSync()

      expect(editableState.isDirty).toBe(false)
      expect(editableState.draft.name).toBe("Gunnar")
      expect(editableState.draft.city).toBe("Bergen")
    })

    withEffect()
  })

  test("should not set isDirty when a draft field is set to its current value", () => {
    const withEffect = $effect.root(() => {
      const sourceState = $state(sourceStateData)
      const editableState = createEditableDraft(() => getSourceDataFromState(sourceState))

      flushSync()

      editableState.draft.name = "Alice"

      flushSync()

      expect(editableState.isDirty).toBe(false)
    })

    withEffect()
  })
})
