import type { QuestionTagDTO } from "@/types";
import { createBaseApiService } from "../../base-service.api";

const base = createBaseApiService<QuestionTagDTO, Record<string, unknown>>({
  path: "/question-tags",
});

export const questionTagApi = Object.assign({}, base, {});
