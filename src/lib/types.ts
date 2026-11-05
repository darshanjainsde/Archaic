/** Shared domain types (safe for client and server). Money is always integer paise. */

/** "candle": a small animated candle per value (flame on the chosen one); admin picks it per option group. */
export type OptionDisplay = "swatch" | "button" | "dropdown" | "candle";

export type OptionValue = {
  id: string;
  label: string;
  /** Hex colour for swatches (e.g. "#c9a27e") */
  hex?: string | null;
  /** Extra price in paise added when this value is chosen (can be 0) */
  priceDelta: number;
  /** Image shown in the gallery when this value is chosen */
  image?: string | null;
  available: boolean;
  /** Optional second line under the name on "candle" buttons (e.g. "resin · honey") */
  note?: string | null;
};

export type OptionGroup = {
  id: string;
  name: string; // e.g. "Scent", "Colour", "Theme", "Size"
  display: OptionDisplay;
  required: boolean;
  values: OptionValue[];
};

export type Spec = { label: string; value: string };

export type Personalization = {
  enabled: boolean;
  label: string; // e.g. "Name on the label"
  maxLength: number;
  price: number; // paise
  required: boolean;
};

export type Selection = { groupId: string; valueId: string };

/** Snapshot stored on OrderItem.selections */
export type SelectionSnapshot = { group: string; value: string; hex?: string | null };

export type CartLine = {
  key: string; // stable hash of product + selections + personalization
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number; // client-side estimate; server recomputes
  quantity: number;
  selections: Selection[];
  selectionLabels: SelectionSnapshot[];
  personalization?: string;
};

export type ShippingAddress = {
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};
