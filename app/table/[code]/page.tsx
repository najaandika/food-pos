import CustomerOrdering from './customer-ordering';

type TablePageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function TablePage({ params }: TablePageProps) {
  const { code } = await params;

  return <CustomerOrdering tableCode={decodeURIComponent(code)} />;
}
