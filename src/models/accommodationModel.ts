import { Schema, model } from 'mongoose';
import { IAccommodation } from '../types/index.js';

// Enum for discretionary values: 0 = No, 1 = Yes, 3 = Don't Know/Ask
enum DiscretionaryValue {
  No = 0,
  Yes = 1,
  DontKnowAsk = 3
}

const AccommodationSchema = new Schema<IAccommodation>({
  _id: {
    type: String,
    required: true
  },
  GeneralInfo: {
    Name: {
      type: String,
      required: true
    },
    Synopsis: {
      type: String,
      required: false
    },
    Description: {
      type: String,
      required: false
    },
    AccommodationType: {
      type: String,
      required: true
    },
    ServiceProviderId: {
      type: String,
      required: true
    },
    IsOpenAccess: {
      type: Boolean,
      required: true
    },
    IsPubliclyVisible: {
      type: Boolean,
      required: false,
      default: false
    },
    IsPublished: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  PricingAndRequirementsInfo: {
    ReferralIsRequired: {
      type: Boolean,
      required: true
    },
    ReferralNotes: {
      type: String,
      required: false
    },
    Price: {
      type: String,
      required: true
    },
    FoodIsIncluded: {
      type: Number,
      required: true,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    AvailabilityOfMeals: {
      type: String,
      required: false
    }
  },
  ContactInformation: {
    Name: {
      type: String,
      required: false
    },
    Email: {
      type: String,
      required: false
    },
    Telephone: {
      type: String,
      required: false
    },
    AdditionalInfo: {
      type: String,
      required: false
    }
  },
  Address: {
    Street1: {
      type: String,
      required: false
    },
    Street2: {
      type: String,
      required: false
    },
    Street3: {
      type: String,
      required: false
    },
    City: {
      type: String,
      required: false
    },
    Postcode: {
      type: String,
      required: false
    },
    Location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: false
      }
    },
    AssociatedCityId: {
      type: String,
      required: false
    }
  },
  FeaturesWithDiscretionary: {
    AcceptsHousingBenefit: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    AcceptsPets: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    AcceptsCouples: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasDisabledAccess: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    IsSuitableForWomen: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    IsSuitableForYoungPeople: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasSingleRooms: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasSharedRooms: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasShowerBathroomFacilities: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasAccessToKitchen: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasLaundryFacilities: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasLounge: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    AllowsVisitors: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    HasOnSiteManager: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    AdditionalFeatures: {
      type: String,
      required: false
    }
  },
  ResidentCriteriaInfo: {
    AcceptsMen: {
      type: Boolean,
      required: false
    },
    AcceptsWomen: {
      type: Boolean,
      required: false
    },
    AcceptsCouples: {
      type: Boolean,
      required: false
    },
    AcceptsYoungPeople: {
      type: Boolean,
      required: false
    },
    AcceptsFamilies: {
      type: Boolean,
      required: false
    },
    AcceptsBenefitsClaimants: {
      type: Boolean,
      required: false
    }
  },
  SupportProvidedInfo: {
    HasOnSiteManager: {
      type: Number,
      required: false,
      enum: [DiscretionaryValue.No, DiscretionaryValue.Yes, DiscretionaryValue.DontKnowAsk]
    },
    SupportOffered: {
      type: [String],
      required: false
    },
    SupportInfo: {
      type: String,
      required: false
    }
  }
}, { collection: 'TemporaryAccommodation', versionKey: false });

// Remove commented indexes from DB
// Indexes for performance based on database structure
AccommodationSchema.index({ _id: 1 }, { unique: true });
AccommodationSchema.index({ 'GeneralInfo.ServiceProviderId': 1, 'GeneralInfo.Name': 1 });
// AccommodationSchema.index({ 'GeneralInfo.ServiceProviderId': 1, 'GeneralInfo.IsPubliclyVisible': 1, 'GeneralInfo.Name': 1 }, { name: 'GeneralInfo.ServiceProviderId_1_GeneralInfo.IsPubliclyVisible_1_GeneralInfo.Name_1' });
AccommodationSchema.index({ 'Address.AssociatedCityId': 1, 'GeneralInfo.Name': 1 });
AccommodationSchema.index({ 'Address.Location': '2dsphere' });
AccommodationSchema.index({ 'GeneralInfo.Name': -1 });
// AccommodationSchema.index({ 'GeneralInfo.IsPubliclyVisible': 1, 'GeneralInfo.Name': -1 });

const Accommodation = model<IAccommodation>('TemporaryAccommodation', AccommodationSchema);

export default Accommodation;
