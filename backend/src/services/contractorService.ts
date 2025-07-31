// Bridge service to access database contractorService from within src directory
export { contractorService } from '../../database/services/contractorService';
export type { 
  CreateContractorData, 
  ContractorFilter,
  Contractor
} from '../../database/types'; 