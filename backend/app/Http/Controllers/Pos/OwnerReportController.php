<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Services\Pos\Reporting\ReportFilters;
use App\Services\Pos\Reporting\ReportQueries;
use App\Services\Pos\Reporting\ReportSummary;
use App\Services\Pos\Reporting\ReportTransactionRow;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OwnerReportController extends Controller
{
    private const PAGE_SIZE = 10;

    private const PRINT_LIMIT = 500;

    public function __construct(
        private readonly ReportQueries $queries,
        private readonly ReportSummary $summary,
        private readonly ReportTransactionRow $transactionRow,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = ReportFilters::fromRequest($request);
        $aggregate = $this->summary->build($filters);
        $transactions = $this->queries->transactions($filters)->paginate(self::PAGE_SIZE, ['*'], 'page', $filters['page']);

        return response()->json([
            'source' => 'database',
            'timezone' => ReportFilters::TIMEZONE,
            'range' => [
                'from' => $filters['from'],
                'to' => $filters['to'],
                'days' => count($aggregate['series']),
            ],
            'filters' => [
                'method' => $filters['method'],
                'status' => $filters['status'],
                'search' => $filters['search'],
                'sort' => $filters['sort'],
            ],
            'generatedAt' => CarbonImmutable::now('UTC')->toIso8601String(),
            'summary' => $aggregate['summary'],
            'series' => $aggregate['series'],
            'methods' => $aggregate['methods'],
            'categories' => $aggregate['categories'],
            'channels' => $aggregate['channels'],
            'serviceTypes' => $aggregate['serviceTypes'],
            'transactions' => [
                'items' => collect($transactions->items())->map(
                    fn (object $row): array => $this->transactionRow->fromQuery($row),
                )->all(),
                'page' => $transactions->currentPage(),
                'perPage' => self::PAGE_SIZE,
                'total' => $transactions->total(),
                'lastPage' => $transactions->lastPage(),
            ],
        ])->header('Cache-Control', 'private, no-store, max-age=0');
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $filters = ReportFilters::fromRequest($request);
        $filename = 'food-pos-report-'.$filters['from'].'-'.$filters['to'].'.csv';
        $query = $this->queries->transactions($filters);

        return response()->streamDownload(function () use ($query): void {
            $output = fopen('php://output', 'w');
            if ($output === false) {
                throw new \RuntimeException('Unable to open CSV output stream.');
            }
            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, ReportTransactionRow::CSV_HEADERS);

            foreach ($query->cursor() as $row) {
                fputcsv($output, $this->transactionRow->csv($this->transactionRow->fromQuery($row)));
            }
            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function print(Request $request): View
    {
        $filters = ReportFilters::fromRequest($request);
        // Printing is deliberately capped; CSV export supports all filtered rows.
        $rows = $this->queries->transactions($filters)->limit(self::PRINT_LIMIT)->get()->map(
            fn (object $row): array => $this->transactionRow->fromQuery($row),
        );

        return view('pos.report-print', [
            'rows' => $rows,
            'from' => $filters['from'],
            'to' => $filters['to'],
            'timezone' => ReportFilters::TIMEZONE,
        ]);
    }
}
