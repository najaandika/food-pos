import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';

export default function Appearance() {
    return (
        <>
            <Head title="Light mode" />

            <h1 className="sr-only">Light mode</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Light mode"
                    description="This application currently uses light mode only."
                />
            </div>
        </>
    );
}
