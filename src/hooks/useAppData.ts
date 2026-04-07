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
import { loadInitialAppData, persistAppData } from "../services/appDataService";

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

  // Désormais chargés depuis Supabase
  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>([]);
  const [transferOrders, setTransferOrders] = useState<TransferOrderLine[]>([]);
  const [fridgeStock, setFridgeStock] = useState<FridgeStockRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);

  // Encore en local pour l'instant
  const [shipments, setShipments] = useState<Shipment[]>(appData.shipments);
  const [defrostList, setDefrostList] = useState<DefrostLine[]>(
    appData.defrostList
  );

  useEffect(() => {
    persistAppData({
      screen,
      shipments,
      defrostList,
    });
  }, [screen, shipments, defrostList]);

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
