# Synthetic O3 appointment fixture

This fixture contains no credentials, network integrations, dependencies, or real
customer data. Implement `normalizeCustomerName(value)` with these exact rules:

1. accept only a JavaScript string;
2. remove leading and trailing whitespace with JavaScript `String.prototype.trim`;
3. throw `TypeError` with message `CUSTOMER_NAME_REQUIRED` when the trimmed result
   is empty or the input is not a string;
4. otherwise return the trimmed string unchanged;
5. do not add dependencies or change the public function name.

The checked-in test is the only permitted O3 acceptance command for this fixture.
