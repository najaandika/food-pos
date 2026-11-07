<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Laporan Food POS {{ $from }} - {{ $to }}</title>
    <style>
        :root { font-family: Inter, Arial, sans-serif; color: #1c2734; background: #fff; }
        body { max-width: 1100px; margin: 36px auto; padding: 0 20px; }
        header { display:flex; justify-content:space-between; align-items:center; margin-bottom:26px; }
        h1 { font-size:24px; margin:0 0 5px; }
        p { margin:0; color:#536171; font-size:12px; }
        button { border:1px solid #cbd5df; background:#fff; border-radius:8px; padding:9px 16px; cursor:pointer; }
        table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px; }
        th,td { border-bottom:1px solid #dfe5eb; padding:9px 7px; text-align:left; overflow-wrap:anywhere; }
        th { background:#f3f5f7; color:#4b5b6b; }
        td.amount { text-align:right; white-space:nowrap; }
        footer { margin-top:20px; color:#64748b; font-size:11px; }
        @media print {
            body { max-width:none; margin:0; padding:0; }
            .no-print { display:none; }
            @page { size:A4 landscape; margin:12mm; }
            tr { break-inside:avoid; }
            thead { display:table-header-group; }
        }
    </style>
</head>
<body>
    <header>
        <div>
            <h1>Laporan Transaksi — Food POS</h1>
            <p>Periode {{ $from }} s.d. {{ $to }} · {{ $timezone }} · berdasarkan waktu pembayaran/aktivitas</p>
        </div>
        <button class="no-print" type="button" onclick="window.print()">Cetak / Simpan PDF</button>
    </header>
    <table>
        <thead><tr>
            <th>Pesanan</th><th>Pelanggan</th><th>Meja</th>
            <th>Metode</th><th>Status</th><th>Waktu (WIB)</th><th>Jumlah (Rp)</th>
        </tr></thead>
        <tbody>
        @forelse ($rows as $row)
            <tr>
                <td>{{ $row['orderNumber'] }}</td>
                <td>{{ $row['customerName'] }}</td>
                <td>{{ $row['tableCode'] ?? '—' }}</td>
                <td>{{ strtoupper($row['method']) }}</td>
                <td>{{ $row['status'] }}</td>
                <td>{{ \Carbon\CarbonImmutable::parse($row['at'])->setTimezone($timezone)->format('d/m/Y H:i') }}</td>
                <td class="amount">{{ number_format($row['amount'], 2, ',', '.') }}</td>
            </tr>
        @empty
            <tr><td colspan="7">Tidak ada transaksi pada filter ini.</td></tr>
        @endforelse
        </tbody>
    </table>
    <footer>
        Menampilkan {{ count($rows) }} transaksi pertama dari filter laporan (maksimum 500).
        Untuk seluruh transaksi yang sesuai filter, gunakan ekspor CSV.
        Gunakan dialog browser “Simpan sebagai PDF” untuk membuat file PDF.
    </footer>
</body>
</html>
