import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ShippingFormInputs, shippingFormSchema } from "@/types";

const ShippingForm = ({
  initialValues,
  setShippingForm,
}: {
  initialValues?: ShippingFormInputs;
  setShippingForm: (data: ShippingFormInputs) => void;
}) => {
  const [values, setValues] = useState<ShippingFormInputs>(() => ({
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    phone: initialValues?.phone ?? "",
    address: initialValues?.address ?? "",
    city: initialValues?.city ?? "",
  }));
  const [errors, setErrors] = useState<
    Partial<Record<keyof ShippingFormInputs, string>>
  >({});

  const router = useRouter();

  useEffect(() => {
    if (!initialValues) {
      return;
    }

    setValues(initialValues);
  }, [initialValues]);

  const updateField = (field: keyof ShippingFormInputs, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleShippingForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = shippingFormSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof ShippingFormInputs, string>> = {};

      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !(field in nextErrors)) {
          nextErrors[field as keyof ShippingFormInputs] = issue.message;
        }
      }

      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setShippingForm(parsed.data);
    router.push("/cart?step=3", { scroll: false });
  };

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={handleShippingForm}>
      <div className="rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-foreground">
        <div className="flex items-center gap-2 font-medium">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Delivery details
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Your details stay in this tab while you complete checkout and are
          cleared after payment.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="name"
            className="text-xs font-semibold text-foreground"
          >
            Name
          </label>
          <Input
            type="text"
            id="name"
            autoComplete="shipping name"
            placeholder="Jordan Lee"
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          {errors.name && (
            <p
              id="name-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-foreground"
          >
            Email
          </label>
          <Input
            type="email"
            id="email"
            autoComplete="email"
            placeholder="jordan@example.com"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-xs text-destructive"
            >
              {errors.email}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="phone"
          className="text-xs font-semibold text-foreground"
        >
          Phone
        </label>
        <Input
          type="tel"
          id="phone"
          autoComplete="tel"
          inputMode="tel"
          placeholder="(555) 123-4567"
          required
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          value={values.phone}
          onChange={(event) => updateField("phone", event.target.value)}
        />
        {errors.phone && (
          <p id="phone-error" role="alert" className="text-xs text-destructive">
            {errors.phone}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="address"
          className="text-xs font-semibold text-foreground"
        >
          Address
        </label>
        <Input
          type="text"
          id="address"
          autoComplete="shipping street-address"
          placeholder="123 Main Street"
          required
          aria-invalid={Boolean(errors.address)}
          aria-describedby={errors.address ? "address-error" : undefined}
          value={values.address}
          onChange={(event) => updateField("address", event.target.value)}
        />
        {errors.address && (
          <p
            id="address-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.address}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="city" className="text-xs font-semibold text-foreground">
          City
        </label>
        <Input
          type="text"
          id="city"
          autoComplete="shipping address-level2"
          placeholder="New York"
          required
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? "city-error" : undefined}
          value={values.city}
          onChange={(event) => updateField("city", event.target.value)}
        />
        {errors.city && (
          <p id="city-error" role="alert" className="text-xs text-destructive">
            {errors.city}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full gap-2">
        Continue to secure payment
        <ArrowRight className="h-4 w-4" />
      </Button>
      {initialValues ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Saved delivery details loaded.
        </p>
      ) : null}
    </form>
  );
};

export default ShippingForm;
