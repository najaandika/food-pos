<?php

namespace App\Enums;

enum OrderSource: string
{
    case Qr = 'qr';
    case Manual = 'manual';
}
