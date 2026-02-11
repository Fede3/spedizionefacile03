<?php

namespace App\Cart;

use Money\Money;
use Money\Currency;
use NumberFormatter;
use App\Cart\MyMoney;
use Money\Currencies\ISOCurrencies;
use Money\Formatter\IntlMoneyFormatter;

class MyMoney {
    protected $money;

    public function __construct($value) {
        $this->money = new Money($value, new Currency('EUR'));
    }

    public function amount() {
        return $this->money->getAmount();
    }

    public function formatted() {
        $currencies = new ISOCurrencies();
        $numberFormatter = new NumberFormatter('it_IT', NumberFormatter::CURRENCY);
        $moneyFormatter = new IntlMoneyFormatter($numberFormatter, $currencies);

        return $moneyFormatter->format($this->money);
    }

    public function instance() {
        return $this->money;
    }

    public function add(MyMoney $money) {
        $this->money = $this->money->add($money->instance());

        return $this;
    }
}