export interface IApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export class ApiResponse {
  static success<T>(data?: T, message?: string): IApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(message: string, errors?: any): IApiResponse {
    return {
      success: false,
      message,
      errors,
    };
  }
}
