<?php

namespace App\Enums;

enum TableStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Preparing = 'preparing';
    case Ready = 'ready';
    case WaitingPayment = 'waiting_payment';
    case NeedWaiter = 'need_waiter';
    case Inactive = 'inactive';
}
