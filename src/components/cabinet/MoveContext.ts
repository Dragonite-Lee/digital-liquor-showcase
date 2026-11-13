import { createContext, useContext } from 'react';

type Move = {
  /** 집어 든 병. 있으면 선반의 모든 칸이 놓을 자리가 된다. */
  movingId: string | null;
  canMove: boolean;
  pick: (id: string) => void;
  place: (slot: number) => void;
};

export const MoveContext = createContext<Move>({ movingId: null, canMove: false, pick: () => {}, place: () => {} });

export const useMove = () => useContext(MoveContext);
