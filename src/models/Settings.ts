import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPrinterSettings {
  pageSize: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  showHeader: boolean;
  showFooter: boolean;
  printCopies: number;
}

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  invoicePrefix: string;
  currency: string;
  currencySymbol: string;
  theme: "light" | "dark" | "system";
  printerSettings: IPrinterSettings;
  createdAt: Date;
  updatedAt: Date;
}

const PrinterSettingsSchema = new Schema<IPrinterSettings>({
  pageSize: {
    type: String,
    default: "A4",
    enum: ["A4", "A5", "Letter", "Legal"],
  },
  marginTop: {
    type: String,
    default: "10mm",
  },
  marginBottom: {
    type: String,
    default: "10mm",
  },
  marginLeft: {
    type: String,
    default: "10mm",
  },
  marginRight: {
    type: String,
    default: "10mm",
  },
  showHeader: {
    type: Boolean,
    default: true,
  },
  showFooter: {
    type: Boolean,
    default: true,
  },
  printCopies: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
});

const SettingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    invoicePrefix: {
      type: String,
      default: "INV",
      trim: true,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
    currencySymbol: {
      type: String,
      default: "₹",
      trim: true,
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
    printerSettings: {
      type: PrinterSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

const Settings: Model<ISettings> =
  mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;
