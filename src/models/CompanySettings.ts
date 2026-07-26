import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
}

export interface ICompanySettings extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  address: string;
  mobileNumber: string;
  bankDetails: IBankDetails;
  signature: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>({
  bankName: {
    type: String,
    default: "",
    trim: true,
  },
  accountHolderName: {
    type: String,
    default: "",
    trim: true,
  },
  accountNumber: {
    type: String,
    default: "",
    trim: true,
  },
  ifscCode: {
    type: String,
    default: "",
    trim: true,
  },
  branch: {
    type: String,
    default: "",
    trim: true,
  },
});

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    mobileNumber: {
      type: String,
      default: "",
      trim: true,
    },
    bankDetails: {
      type: BankDetailsSchema,
      default: () => ({}),
    },
    signature: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const CompanySettings: Model<ICompanySettings> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);

export default CompanySettings;
