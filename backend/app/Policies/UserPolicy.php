<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;

class UserPolicy
{
    private function isOwner(User $actor): bool
    {
        return $actor->is_active && $actor->role === Role::Owner;
    }

    public function viewAny(User $actor): bool
    {
        return $this->isOwner($actor);
    }

    public function view(User $actor, User $staff): bool
    {
        return $actor->is_active && ($this->isOwner($actor) || $actor->is($staff));
    }

    public function create(User $actor): bool
    {
        return $this->isOwner($actor);
    }

    public function update(User $actor, User $staff): bool
    {
        return $this->isOwner($actor);
    }

    public function delete(User $actor, User $staff): bool
    {
        // Never allow deleting your own account or another Owner from the
        // staff-management endpoint. Owner removal needs a separate workflow.
        return $this->isOwner($actor)
            && ! $actor->is($staff)
            && $staff->role !== Role::Owner;
    }
}
