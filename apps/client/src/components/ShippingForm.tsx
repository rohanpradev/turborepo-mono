import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ShippingFormInputs>({
    defaultValues: initialValues,
    resolver: zodResolver(shippingFormSchema),
  });

  const router = useRouter();

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handleShippingForm: SubmitHandler<ShippingFormInputs> = (data) => {
    setShippingForm(data);
    router.push("/cart?step=3", { scroll: false });
  };

  return (
    <form
      className="flex w-full flex-col gap-5"
      onSubmit={handleSubmit(handleShippingForm)}
    >
      <div className="rounded-lg border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-950">
        <div className="flex items-center gap-2 font-medium">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Delivery details
        </div>
        <p className="mt-1 text-xs leading-5 text-teal-800">
          Your details stay in this tab while you complete checkout and are
          cleared after payment.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs font-medium text-gray-700">
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
            {...register("name")}
          />
          {errors.name && (
            <p id="name-error" role="alert" className="text-xs text-red-700">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs font-medium text-gray-700">
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
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-xs text-red-700">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="phone" className="text-xs font-medium text-gray-700">
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
          {...register("phone")}
        />
        {errors.phone && (
          <p id="phone-error" role="alert" className="text-xs text-red-700">
            {errors.phone.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-xs font-medium text-gray-700">
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
          {...register("address")}
        />
        {errors.address && (
          <p id="address-error" role="alert" className="text-xs text-red-700">
            {errors.address.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="city" className="text-xs font-medium text-gray-700">
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
          {...register("city")}
        />
        {errors.city && (
          <p id="city-error" role="alert" className="text-xs text-red-700">
            {errors.city.message}
          </p>
        )}
      </div>
      <Button type="submit" className="w-full gap-2">
        Continue to secure payment
        <ArrowRight className="h-4 w-4" />
      </Button>
      {initialValues ? (
        <p className="flex items-center justify-center gap-2 text-xs text-teal-700">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Saved delivery details loaded.
        </p>
      ) : null}
    </form>
  );
};

export default ShippingForm;
