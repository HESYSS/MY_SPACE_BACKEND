// src/employee/dto/create-employee.dto.ts
export interface CreateEmployeeDto {
  firstName: string;
  lastName: string;
  position: string;
  experienceYears?: number;
  profile?: string;
  aboutMe?: string;
  firstNameEn?: string;
  lastNameEn?: string;
  positionEn?: string;
  profileEn?: string;
  aboutMeEn?: string;
  isPARTNER?: boolean;
  isMANAGER?: boolean;
  isACTIVE?: boolean;
}