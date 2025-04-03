import { createMockApiClient } from './types/apiClient';
import { ApiResponse } from '@/services/api/apiResponse';

export const mockApiClient = createMockApiClient();

export const mockApiCall = (response: ApiResponse<any>) => {
  mockApiClient.call.mockResolvedValue(response);
};

export const mockApiError = (error: Error) => {
  mockApiClient.call.mockRejectedValue(error);
};

export const resetApiMocks = () => {
  mockApiClient.call.mockClear();
};
