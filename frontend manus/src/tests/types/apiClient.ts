import { ApiResponse } from '@/services/api/apiResponse';

// Define the mock API client type
export type MockApiClient = {
  call: jest.Mock<Promise<ApiResponse<any>>, [Function, string, string, any]>;
};

// Create a mock API client instance
export const createMockApiClient = (): MockApiClient => ({
  call: jest.fn(),
});
