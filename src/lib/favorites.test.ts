import { describe, expect, test } from "bun:test";
import { parseFavoriteIds, toggleFavoriteId } from "./favorites";

describe("visitor favorites", () => {
  test("saving a tourist site survives serialization", () => {
    expect(parseFavoriteIds(JSON.stringify(toggleFavoriteId([], "tourist-site-1")))).toEqual(["tourist-site-1"]);
  });
  test("removing a favorite preserves other saved sites", () => {
    expect(toggleFavoriteId(["site-1", "site-2"], "site-1")).toEqual(["site-2"]);
  });
  test("invalid storage and duplicate IDs are handled", () => {
    expect(parseFavoriteIds("bad json")).toEqual([]);
    expect(parseFavoriteIds('["site-1","site-1",null,2]')).toEqual(["site-1"]);
  });
});