export interface User {
  id: string;
  uid: string;  // Firebase auth user ID
  email: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'partner';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  partnerId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}
