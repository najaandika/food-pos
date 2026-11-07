<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed a repeatable POS demo without deleting existing application data.
     *
     * The demo seeder itself refuses non-local/non-testing environments.
     */
    public function run(): void
    {
        $this->call(DemoPosSeeder::class);
    }
}
