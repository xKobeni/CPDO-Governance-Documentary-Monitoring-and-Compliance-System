import { useEffect, useState } from "react";
import { getAuthState, subscribeAuth } from "../store/auth-store";

export function useAuth() {
  const [state, setState] = useState(getAuthState());

  useEffect(() => {
    return subscribeAuth(setState);
  }, []);

  return state;
}