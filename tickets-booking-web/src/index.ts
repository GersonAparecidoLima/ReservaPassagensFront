export interface Viagem {
  id: string;
  origem: string;
  destino: string;
  dataHora: string;
  preco: number;
  poltronasDisponiveis: number[];
}

export interface Reserva {
  id: string;
  viagemId: string;
  viagem?: Viagem;
  nomePassageiro: string;
  documento: string;
  poltrona: number;
}