// Pricing Variables
const VAT_RATE = 21;
const GLOBAL_FACTOR = 1.05;
const LOCAL_FACTOR = 1;
const BASE_SURCHARGE = 0.12;
const QUANTITY_SURCHARGE = 25;
const LARGE_LENGTH_SURCHARGE = 0.25;
const EXTRA_LARGE_LENGTH_SURCHARGE = 0.35;
const SUPER_LARGE_LENGTH_SURCHARGE = 0.50;
const WIDE_WIDTH_SURCHARGE = 25;
const PROFIT_MARGIN_SMALL = 0.65;
const PROFIT_MARGIN_MEDIUM = 0.64;
const ADDITIONAL_FACTOR = 1.05;

const SURFACE_FACTORS = [
    { maxSurface: 200, factor: 0.18 },
    { maxSurface: 500, factor: 0.08 },
    { maxSurface: 3000, factor: 0.02 },
    { maxSurface: Infinity, factor: 0 }
];

const LENGTH_THRESHOLD_1 = 0.999;
const LENGTH_THRESHOLD_2 = 1.249;
const LENGTH_THRESHOLD_3 = 1.499;
const WIDTH_THRESHOLD = 0.9;
const QUANTITY_THRESHOLD_1 = 51;
const QUANTITY_THRESHOLD_2 = 251;

function calcformCalculate() {
    const calcForm = document.getElementById('wbc-calcform');

    var Mat = document.getElementById('field-box-kwaliteit');
    var Col = document.getElementById('field-box-kleur');
    const length = parseLocaleFloat(document.getElementById('field-box-lengte').value);
    const width = parseLocaleFloat(document.getElementById('field-box-breedte').value);
    const quantity = Number.parseInt(document.getElementById('field-box-aantal').value, 10);
    const material = parseLocaleFloat(document.getElementById('field-box-kwaliteit').value);
    const materialText = Mat.options[Mat.selectedIndex].text;
    const color = document.getElementById('field-box-kleur').value;
    const colorText = Col.options[Col.selectedIndex].text;

    clearAlert();

    if (!length || !width || !quantity || !material || !color) {
        document.getElementById('wbc-prices').style.display = 'none';
        return;
    }

    const factor = Number((LOCAL_FACTOR * GLOBAL_FACTOR).toFixed(5));

    if (!(validateNumber(length) && validateNumber(width) && validateNumber(quantity))) {
        AlertMSG('Voer geldige cijfers in voor alle afmetingen en aantallen.');
        return;
    }
    if (quantity < 10 || quantity >= 1001) {
        AlertMSG('De prijs voor minder dan 10 of meer dan 1.000 dozen kunnen wij niet online berekenen. Neem contact met ons op om hier een offerte voor te ontvangen.');
        return;
    }

    const dimensions = {
        length: mmToM(length),
        width: mmToM(width),
    };
    const surface = getSurface(dimensions);
    const factors = {
        global: normalizeGlobalFactor(factor),
        material: material,
        surface: getSurfaceFactor(surface, quantity),
    };

    if (factors.material == null) {
        AlertMSG('Invalid material selection.');
        return;
    }

    const surpluses = {
        color: getColorSurplus(color, surface),
        content: getContentSurplus(dimensions, quantity),
    };
    const modifiers = {
        quantum: getQuantumModifier(quantity),
    };
    const basePrice = getBasePrice(surface, factors);
    const unitPriceExclVat = getUnitPriceExclVat(basePrice, quantity, surpluses, factors, modifiers);
    const unitPriceInclVat = getUnitPriceInclVat(unitPriceExclVat);
    const totalPriceExclVat = getTotalPrice(unitPriceExclVat, quantity);
    const totalPriceInclVat = getTotalPrice(unitPriceInclVat, quantity);

    if (unitPriceExclVat && totalPriceExclVat) {
        const unitPrice = unitPriceExclVat.toFixed(2);
        const totalPrice = totalPriceExclVat.toFixed(2);
        document.getElementById('wbc-detail-quality').textContent = materialText;
        document.getElementById('wbc-detail-color').textContent = colorText;
        document.getElementById('wbc-price-length').textContent = length;
        document.getElementById('wbc-price-width').textContent = width;
        document.getElementById('wbc-price-qty').textContent = quantity;
        document.getElementById('wbc-price-unit').textContent = unitPrice.replace('.', ',');
        document.getElementById('wbc-price-total').textContent = totalPrice.replace('.', ',');
        document.getElementById('wbc-prices').style.display = 'block';

        // Fill hidden fields
        document.getElementById('unit-price').value = unitPrice;
        document.getElementById('total-price').value = totalPrice;
        document.getElementById('quantity').value = quantity;
        document.getElementById('dimensions').value = `${length} x ${width} mm`;
        document.getElementById('quality').value = materialText;
        document.getElementById('color').value = colorText;
    } else {
        document.getElementById('wbc-prices').style.display = 'none';
    }
}

function getBasePrice(surface, factors) {
    return surface * (factors.material + factors.surface);
}

function getColorSurplus(color, surface) {
    return color === '' ? 0.0000001 : parseFloat(color) * surface;
}

function getContentSurplus(dimensions, quantity) {
    let surplus = 0;

    if (dimensions.length > 1.35) {
        surplus += QUANTITY_SURCHARGE / quantity;
    }
    if (dimensions.length > LENGTH_THRESHOLD_1) {
        surplus += LARGE_LENGTH_SURCHARGE;
    }
    if (dimensions.length > LENGTH_THRESHOLD_2) {
        surplus += EXTRA_LARGE_LENGTH_SURCHARGE;
    }
    if (dimensions.length > LENGTH_THRESHOLD_3) {
        surplus += SUPER_LARGE_LENGTH_SURCHARGE;
    }
    if (dimensions.width > WIDTH_THRESHOLD) {
        surplus += WIDE_WIDTH_SURCHARGE / quantity;
    }
    return surplus;
}

function getQuantumModifier(quantity) {
    return 0; // All modifiers are set to 0 in the provided code
}

function getSurface(dimensions) {
    return dimensions.length * dimensions.width;
}

function getSurfaceFactor(surface, quantity) {
    const totalSurface = surface * quantity;
    for (let factor of SURFACE_FACTORS) {
        if (totalSurface < factor.maxSurface) {
            return factor.factor;
        }
    }
    return 0;
}

function getTotalPrice(unitPrice, quantity) {
    return Number.parseFloat(unitPrice.toFixed(2)) * quantity;
}

function getUnitPriceExclVat(basePrice, quantity, surpluses, factors, modifiers) {
    const combinedSurpluses = Object.keys(surpluses).reduce((total, key) => total += surpluses[key], 0);
    const baseSurcharge = BASE_SURCHARGE + (QUANTITY_SURCHARGE / quantity);
    const profitMargin = quantity < QUANTITY_THRESHOLD_1 || quantity >= QUANTITY_THRESHOLD_2 ? PROFIT_MARGIN_SMALL : PROFIT_MARGIN_MEDIUM;
    
    return ((((basePrice + (baseSurcharge + combinedSurpluses) + modifiers.quantum) * factors.global)) * ADDITIONAL_FACTOR) / profitMargin;
}

function getUnitPriceInclVat(unitPriceExclVat) {
    return unitPriceExclVat * (1 + (VAT_RATE / 100));
}

function mmToM(value) {
    return value / 1000;
}

function normalizeGlobalFactor(factor) {
    return validateNumber(factor) ? factor : 1;
}

function parseLocaleFloat(numeric, stripDelimiters = []) {
    if (typeof numeric !== 'string') return numeric;
    stripDelimiters.forEach(delimiter => numeric = numeric.replace(new RegExp(`[${delimiter}]`, 'g'), ''));
    return Number.parseFloat(numeric.replace(/,/g, '.'));
}

function validateNumber(number) {
    return !Number.isNaN(number) && number > 0;
}

function AlertMSG(Message) {
    clearAlert();
    let form = document.getElementById('wbc-calcform');
    let div = document.createElement('div');
    div.classList.add('alert');
    let text = document.createTextNode(Message);
    div.appendChild(text);
    form.prepend(div);
}

function clearAlert() {
    const el = document.querySelector('.alert');
    if (el) {
        el.remove();
    }
}

function checkAllFieldsFilled() {
    const inputs = document.querySelectorAll('.wbc-calc-field');
    const formInputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');
    return Array.from(inputs).every(input => input.value.trim() !== '') &&
           Array.from(formInputs).every(input => input.value.trim() !== '');
}

function updateWarningAndButton() {
    const submitButton = document.getElementById('submit-request');
    const warningMessage = document.getElementById('warning-message');
    const allFilled = checkAllFieldsFilled();
    
    submitButton.disabled = !allFilled;
    warningMessage.style.display = allFilled ? 'none' : 'block';
}

// Attach event listeners to form fields
document.addEventListener('DOMContentLoaded', function() {
    const calcFields = document.querySelectorAll('.wbc-calc-field');
    const formFields = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="email"]');

    calcFields.forEach(field => {
        field.addEventListener('input', () => {
            calcformCalculate();
            updateWarningAndButton();
        });
    });

    formFields.forEach(field => {
        field.addEventListener('input', updateWarningAndButton);
    });

    document.getElementById('submit-request').addEventListener('click', function(event) {
        event.preventDefault();
        document.getElementById('submit-request').style.display = 'none';
        document.getElementById('loading-indicator').style.display = 'block';
        document.querySelector('form').submit();
    });

    // Initial calculation and warning/button state update
    calcformCalculate();
    updateWarningAndButton();
});
