import { useEffect, useState } from "react";
import type {
  DefrostLine,
  FridgeStockRow,
  MovementRow,
  Product,
  Screen,
  Shipment,
  TransferOrderLine,
} from "../types";
import {
  loadInitialAppData,
  persistAppData,
} from "../services/appDataService";

type UseAppDataResult = {
  screen: Screen;
  setScreen: React.Dispatch<React.SetStateAction<Screen>>;
  assortmentProducts: Product[];
  setAssortmentProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  transferOrders: TransferOrderLine[];
  setTransferOrders: React.Dispatch<React.SetStateAction<TransferOrderLine[]>>;
  shipments: Shipment[];
  setShipments: React.Dispatch<React.SetStateAction<Shipment[]>>;
  defrostList: DefrostLine[];
  setDefrostList: React.Dispatch<React.SetStateAction<DefrostLine[]>>;
  fridgeStock: FridgeStockRow[];
  setFridgeStock: React.Dispatch<React.SetStateAction<FridgeStockRow[]>>;
  movements: MovementRow[];
  setMovements: React.Dispatch<React.SetStateAction<MovementRow[]>>;
};

export function useAppData(): UseAppDataResult {
  const [appData] = useState(() => loadInitialAppData());

  const [screen, setScreen] = useState<Screen>(appData.screen);
  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>(
    appData.assortmentProducts
  );
  const [transferOrders, setTransferOrders] = useState<TransferOrderLine[]>(
    appData.transferOrders
  );
  const [shipments, setShipments] = useState<Shipment[]>(appData.shipments);
  const [defrostList, setDefrostList] = useState<DefrostLine[]>(
    appData.defrostList
  );
  const [fridgeStock, setFridgeStock] = useState<FridgeStockRow[]>(
    appData.fridgeStock
  );
  const [movements, setMovements] = useState<MovementRow[]>(appData.movements);

  useEffect(() => {
    persistAppData({
      screen,
      assortmentProducts,
      transferOrders,
      shipments,
      defrostList,
      fridgeStock,
      movements,
    });
  }, [
    screen,
    assortmentProducts,
    transferOrders,
    shipments,
    defrostList,
    fridgeStock,
    movements,
  ]);

  return {
    screen,
    setScreen,
    assortmentProducts,
    setAssortmentProducts,
    transferOrders,
    setTransferOrders,
    shipments,
    setShipments,
    defrostList,
    setDefrostList,
    fridgeStock,
    setFridgeStock,
    movements,
    setMovements,
  };
}