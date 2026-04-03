import { useMemo, useState } from "react";
import type { MovementRow } from "../types";
import {
  filterMovements,
  getMovementTypeOptions,
  type MovementFilters,
} from "../utils/movements";

const emptyMovementFilters: MovementFilters = {
  type: "",
  sku: "",
  name: "",
  lot: "",
};

export function useMovementFilters(rows: MovementRow[]) {
  const [movementFilters, setMovementFilters] =
    useState<MovementFilters>(emptyMovementFilters);

  const movementTypeOptions = useMemo(
    () => getMovementTypeOptions(rows),
    [rows]
  );

  const filteredMovements = useMemo(
    () => filterMovements(rows, movementFilters),
    [rows, movementFilters]
  );

  return {
    movementFilters,
    setMovementFilters,
    movementTypeOptions,
    filteredMovements,
  };
}