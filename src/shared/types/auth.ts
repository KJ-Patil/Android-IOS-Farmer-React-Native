import { Timestamp } from 'firebase/firestore';

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
}

export interface FamilyMember {
  name: string;
  relation: string;
  age?: number;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  geoLocation?: { lat: number; lng: number };
  language: 'en' | 'hi' | 'mr' | 'te' | 'ta' | 'kn' | 'bn' | 'gu' | 'ml' | 'pa' | 'od';
  membershipType: 'free' | 'gold' | 'premium';
  profilePhoto?: string;
  alternateMobile?: string;
  dateOfBirth?: string;
  aadhaarNumber?: string;
  farmerId?: string;
  bankDetails?: BankDetails;
  familyMembers?: FamilyMember[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  status: 'active' | 'inactive' | 'suspended';
}
