import assert from "node:assert/strict"
import { test } from "node:test"
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod"
import { zodResponseFormat } from "openai/helpers/zod"
import { ChatReplySchema } from "@/lib/record/chat-actions"
import { ExtractSchema } from "./extract.ts"
import { InterviewSchema } from "./interview.ts"
import { QuestionsSchema } from "./questions.ts"
import { ModelSchema } from "./tailor.ts"
import { WriteSchema } from "./write.ts"

// Every schema a model answers in must be accepted by both providers' structured outputs.
// OpenAI rejects an .optional() field without .nullable(), and only says so at request time:
// a new field broke every new resume once (2026-10-25).
const schemas = { ChatReplySchema, ExtractSchema, InterviewSchema, QuestionsSchema, ModelSchema, WriteSchema }

for (const [name, schema] of Object.entries(schemas)) {
  test(`${name} works as structured output on OpenAI and Claude`, () => {
    assert.doesNotThrow(() => zodResponseFormat(schema, "step"))
    assert.doesNotThrow(() => betaZodOutputFormat(schema))
  })
}
