export class PrescriptionQueueQueryDto {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}
