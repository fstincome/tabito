import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { parseFavoriteIds, toggleFavoriteId } from "./favorites";

describe("visitor favorites", () => {
  test("saving a tourist site survives serialization", () => {
    deepStrictEqual(parseFavoriteIds(JSON.stringify(toggleFavoriteId([], "tourist-site-1"))), ["tourist-site-1"]);
  });
  test("removing a favorite preserves other saved sites", () => {
    deepStrictEqual(toggleFavoriteId(["site-1", "site-2"], "site-1"), ["site-2"]);
  });
  test("invalid storage and duplicate IDs are handled", () => {
    deepStrictEqual(parseFavoriteIds("bad json"), []);
    deepStrictEqual(parseFavoriteIds('["site-1","site-1",null,2]'), ["site-1"]);
  });
});