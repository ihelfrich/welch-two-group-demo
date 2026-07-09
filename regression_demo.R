set.seed(123)

n <- 200
group <- rbinom(n, size = 1, prob = 0.45)
x <- rnorm(n)
sigma <- ifelse(group == 1, 3, 1)
y <- 1 + 0.8 * x + 1.5 * group + rnorm(n, mean = 0, sd = sigma)

dat <- data.frame(y = y, x = x, group = group)
fit <- lm(y ~ x + group, data = dat)

print(summary(fit))

default_se <- sqrt(diag(vcov(fit)))

if (requireNamespace("sandwich", quietly = TRUE) &&
    requireNamespace("lmtest", quietly = TRUE)) {
  robust_test <- lmtest::coeftest(fit, vcov. = sandwich::vcovHC(fit, type = "HC2"))
  robust_se <- robust_test[, "Std. Error"]
} else {
  X <- model.matrix(fit)
  e <- residuals(fit)
  h <- hatvalues(fit)
  bread <- solve(crossprod(X))
  meat <- crossprod(X, X * as.numeric(e^2 / (1 - h)))
  vcov_hc2 <- bread %*% meat %*% bread
  robust_se <- sqrt(diag(vcov_hc2))
}

comparison <- data.frame(
  coefficient = "group",
  default_se = unname(default_se["group"]),
  robust_hc2_se = unname(robust_se["group"]),
  row.names = NULL
)

cat("\nDefault vs robust (HC2) standard error for group coefficient:\n")
print(comparison, row.names = FALSE)
