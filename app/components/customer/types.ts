export type CustomerMenuItem = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  badge?: string;
  available?: boolean;
};

export type CustomerCartItem = CustomerMenuItem & {
  quantity: number;
  note: string;
};
