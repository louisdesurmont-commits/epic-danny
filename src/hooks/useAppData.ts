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
import { loadAppData, saveAppData } from "../services/storage";

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
  const [appData] = useState(() => loadAppData());

  const [screen, setScreen] = useState<Screen>(appData.screen);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const [assortmentProducts, setAssortmentProducts] = useState<Product[]>([]);
  const [transferOrders, setTransferOrders] = useState<TransferOrderLine[]>([]);
  const [fridgeStock, setFridgeStock] = useState<FridgeStockRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [defrostList, setDefrostList] = useState<DefrostLine[]>([]);

  useEffect(() => {
    saveAppData({
      screen,
    });
  }, [screen]);

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
