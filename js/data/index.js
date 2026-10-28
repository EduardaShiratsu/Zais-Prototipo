import { MODO_DEMO } from "../config.js";

// Escolhe de onde vêm os dados: demonstração (?demo) ou Firebase.
export async function iniciarDados() {
  if (MODO_DEMO) {
    const { criarDemo } = await import("./demo.js");
    return criarDemo();
  }
  const { criarFirebase } = await import("./firebase.js");
  return criarFirebase();
}
