namespace RepWave.Application.Common.Models;

public class ApiResponse<T>
{
    public string Status { get; set; } = "success";
    public string? Message { get; set; }
    public T? Data { get; set; }

    public static ApiResponse<T> Success(T data, string? message = null)
        => new() { Status = "success", Data = data, Message = message };

    public static ApiResponse<T> Failure(string message)
        => new() { Status = "failure", Message = message };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse SuccessMessage(string message)
        => new() { Status = "success", Message = message };
}

public class PagedResult<T>
{
    public PagedResult() { }

    public PagedResult(IEnumerable<T> data, int totalCount, int page, int pageSize)
    {
        Data = data;
        TotalCount = totalCount;
        Page = page;
        PageSize = pageSize;
    }

    public IEnumerable<T> Data { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
