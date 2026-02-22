from setuptools import setup, find_packages

setup(
    name="kaizen",
    version="1.0.0",
    description="精益管理移动端模块 - Kaizen Management Mobile App",
    author="Your Company",
    author_email="admin@yourcompany.com",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=[],  # frappe 由 bench 管理，不在此处声明
)
