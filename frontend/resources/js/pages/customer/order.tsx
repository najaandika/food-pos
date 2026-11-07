import CustomerOrdering, {
    type QrCatalog,
} from '../../customer/customer-ordering';

type Props = {
    token: string;
    csrfToken: string;
    initialMenu: QrCatalog;
};

export default function CustomerOrderPage(props: Props) {
    return <CustomerOrdering {...props} />;
}
