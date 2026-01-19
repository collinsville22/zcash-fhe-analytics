import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../src/components/MetricCard";
import { StatCard } from "../src/components/StatCard";

describe("MetricCard", () => {
  const defaultProps = {
    icon: <span data-testid="icon">I</span>,
    badge: "ENCRYPTED",
    value: "1,234",
    label: "Total Swaps",
    footer: "Last 24 hours",
    variant: "gold" as const,
  };

  it("renders value", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders label", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("Total Swaps")).toBeInTheDocument();
  });

  it("renders badge", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("ENCRYPTED")).toBeInTheDocument();
  });

  it("renders footer", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByText("Last 24 hours")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(<MetricCard {...defaultProps} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("applies gold variant styles", () => {
    const { container } = render(<MetricCard {...defaultProps} variant="gold" />);
    expect(container.querySelector(".text-gold")).toBeInTheDocument();
  });

  it("applies cyan variant styles", () => {
    const { container } = render(<MetricCard {...defaultProps} variant="cyan" />);
    expect(container.querySelector(".text-cyan")).toBeInTheDocument();
  });

  it("applies rose variant styles", () => {
    const { container } = render(<MetricCard {...defaultProps} variant="rose" />);
    expect(container.querySelector(".text-rose")).toBeInTheDocument();
  });

  it("applies violet variant styles", () => {
    const { container } = render(<MetricCard {...defaultProps} variant="violet" />);
    expect(container.querySelector(".text-violet")).toBeInTheDocument();
  });

  it("applies emerald variant styles", () => {
    const { container } = render(<MetricCard {...defaultProps} variant="emerald" />);
    expect(container.querySelector(".text-emerald")).toBeInTheDocument();
  });
});

describe("StatCard", () => {
  const defaultProps = {
    icon: <span data-testid="stat-icon">S</span>,
    value: "5,678",
    label: "TRANSACTIONS",
    variant: "cyan" as const,
  };

  it("renders value", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText("5,678")).toBeInTheDocument();
  });

  it("renders label", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByText("TRANSACTIONS")).toBeInTheDocument();
  });

  it("renders icon", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.getByTestId("stat-icon")).toBeInTheDocument();
  });

  it("renders meta when provided", () => {
    render(<StatCard {...defaultProps} meta="ZEC" />);
    expect(screen.getByText("ZEC")).toBeInTheDocument();
  });

  it("does not render meta when not provided", () => {
    render(<StatCard {...defaultProps} />);
    expect(screen.queryByText("ZEC")).not.toBeInTheDocument();
  });

  it("applies cyan variant styles", () => {
    const { container } = render(<StatCard {...defaultProps} variant="cyan" />);
    expect(container.querySelector(".text-cyan")).toBeInTheDocument();
  });

  it("applies gold variant styles", () => {
    const { container } = render(<StatCard {...defaultProps} variant="gold" />);
    expect(container.querySelector(".text-gold")).toBeInTheDocument();
  });
});
