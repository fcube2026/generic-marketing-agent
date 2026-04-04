import { useQuery } from '@tanstack/react-query';
import { providerService } from '../services/providerService';

export const useRecommendation = (params: {
  lat: number;
  lng: number;
  serviceCategory: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}) => {
  return useQuery({
    queryKey: ['recommendation', params],
    queryFn: () => providerService.getRecommendation(params),
    enabled: !!params.lat && !!params.lng,
  });
};
