export interface ReportData {
  containerNumber: string;
  sealPhoto: File | null;
  containerNumPhoto: File | null;
  cartonLabelPhoto: File | null;
  producePhoto: File | null;
  temperature: string;
  temperaturePhoto: File | null;
  temperatureLogCollected: boolean;
}

export enum StepType {
  CONTAINER_DETAILS = 'CONTAINER_DETAILS',
  SEAL_CHECK = 'SEAL_CHECK',
  INTERNAL_CHECK = 'INTERNAL_CHECK',
  CARTON_CHECK = 'CARTON_CHECK',
  TEMP_CHECK = 'TEMP_CHECK',
  REVIEW = 'REVIEW'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
