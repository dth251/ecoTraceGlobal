import { http, HttpResponse } from "msw";
import { sampleFacilities, samplePeriods, sampleSummary } from "@/test/fixtures/sample";

export const handlers = [
  http.get("/api/v1/facilities", () => HttpResponse.json(sampleFacilities)),
  http.get("/api/v1/periods", () => HttpResponse.json(samplePeriods)),
  http.get("/api/v1/periods/:id/summary", () => HttpResponse.json(sampleSummary)),
];
